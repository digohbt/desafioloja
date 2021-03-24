import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { preProcessFile } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const addProduct = async (productId: number) => {
    try {
          // verificar se cart ja tem algum produto 
      const produtoExistecart  =  cart.find((product) => product.id === productId );

      const {data : produto} = await api.get<Product>(`products/${productId}`)
       // verifica quantidade estoque 
       const  { data : productEstoque} = await api.get<Stock>(`stock/${productId}`) 
      if(!productEstoque  ){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
     if(!produtoExistecart && productEstoque.amount > 0  ){
        produto.amount = 1
        setCart([
          ...cart,
          produto
        ])

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([
            ...cart, 
            { ...produto, amount: 1 }
          ]));
        // local storege 
        return 
     }else {
       if(produtoExistecart?.amount && productEstoque.amount > produtoExistecart?.amount){
         produtoExistecart.amount = produtoExistecart.amount + 1
         const newCart = cart.filter( (item) => item.id != produtoExistecart.id )
        //  console.log(newCart,"===========")
         setCart([
         ...newCart ,
         produtoExistecart
        ])

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([
            ...cart, 
            { ...produto, amount: 1 }
          ]));
        // local storege 
        // console.log(cart)
       }else {
        toast.error('Erro na adição do produto');
        return
       }
       
     }
    } catch {
      // TODO
      toast.error('Erro na adição do produto');

    }
  };

  const removeProduct = (productId: number) => {

    try {

     const newCart = cart.filter( item => item.id != productId)
    //  console.log(newCart, "newcart")
     localStorage.setItem(
      "@RocketShoes:cart",
      JSON.stringify([
       ...newCart
      ]));

    return setCart([
       ...newCart
     ])
     
    } catch {
       toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const  { data : productEstoque} = await api.get<Stock>(`stock/${productId}`) 

      if(Number(productEstoque.amount) < amount ){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      if(productEstoque.amount < 1) {
        toast.error("Erro na remoção do produto")
      }
      const newCart = cart.map((product) =>
          product.id === productId ? { ...product, amount } : product
        );
        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart,  addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
