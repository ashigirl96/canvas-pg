import type { NextPage } from 'next'
import React from 'react'
import { Canvas } from '../components/Canvas'

type ContainerProps = {
  children: React.ReactNode
}

const Container: React.FC<ContainerProps> = ({ children }) => {
  return (
    <div className="flex h-full w-full flex-col select-none">{children}</div>
  )
}
const Home: NextPage = () => {
  return (
    <Container>
      <div className="w-full h-full overflow-hidden relative">
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <Canvas />
      </div>
    </Container>
  )
}

export default Home
